
(async function () {

  const startImageSrc = './start.svg';
  const startImage = new daum.maps.MarkerImage(startImageSrc, new daum.maps.Size(10, 10));
  const endImageSrc = './end.svg';
  const endImage = new daum.maps.MarkerImage(endImageSrc, new daum.maps.Size(10, 10));

  function hslToHex(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    const toHex = x => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  function heatMapColorforValue(value) {
    let h = 240 + (360 - 240) * value;
    return hslToHex(h, 100, 50);
  }

  /**
   * parse socar api
   */
  function parseSocarItem(item) {
    const { name: from, distance, detail: _details } = item;
    const { name: to, detail: details } = _details[0];
    const [ detail ] = details;

    return {
      from,
      to,
      detail,
      get journeyText() {
        return `${this.from}->${this.to}`;
      }
    };
  }

  function setVisibility(map, item, visible) {
    if (!item.ref) return;
    item.ref.fromMarker.setVisible(visible);
    item.ref.toMarker.setVisible(visible);
    visible ? item.ref.path.setMap(map) : item.ref.path.setMap(null);
  }

  function renderMarker(map, title, image, { lat, lng }) {
    return new daum.maps.Marker({
      map: map,
      position: new daum.maps.LatLng(lat, lng),
      title: title,
      image: image,
    });
  }

  function renderPath(map, start, end, color) {

    const linePath = [
      new daum.maps.LatLng(start.lat, start.lng),
      new daum.maps.LatLng(end.lat, end.lng),
    ];

    const polyline = new daum.maps.Polyline({
      path: linePath,
      strokeWeight: 4,
      strokeColor: color,
      strokeOpacity: 0.8,
      strokeStyle: 'solid'
    });

    polyline.setMap(map);
    return polyline;
  }

  function renderMap(map, items = []) {

    const {
      min,
      max
    } = {
      min: Math.max(...items.map(item => item.detail.credit)),
      max: Math.min(...items.map(item => item.detail.credit)),
    };

    for (const item of items) {

      const start = {
        lat: parseFloat(item.detail.start_zone_lat),
        lng: parseFloat(item.detail.start_zone_lng),
      };
      const end = {
        lat: parseFloat(item.detail.end_zone_lat),
        lng: parseFloat(item.detail.end_zone_lng),
      };

      const fromMarker = renderMarker(map, item.from, startImage, start);
      const toMarker = renderMarker(map, item.to, endImage, end);
      const path = renderPath(map, start, end, heatMapColorforValue((item.detail.credit) / (min + max)));

      item.ref = {
        fromMarker,
        toMarker,
        path,
      };
    }
  }

  function renderList(items = []) {
    const list = $('#list');

    for (const item of items) {

      const { from, to, detail } = item;
      const listItem = list.find('._template').first().clone();

      listItem.find('.from').text(from);
      listItem.find('.to').text(to);
      listItem.removeClass('_template');

      listItem.appendTo(list);
    }
  }

  function filterList(fromTime, toTime, map, items = []) {
    for (const item of items) {
      const isVisible = fromTime < item.detail.start_time && item.detail.start_time < toTime;
      setVisibility(map, item, isVisible);
    }
  }

  async function getSocarData(socarApiKey, { latitude, longitude } = {}, immediate = false) {
    const url = `https://api.socar.kr/reserve/return_list_all?callback=?&auth_token=${socarApiKey}&view_type=handler&region_type=4&lat=${latitude}&lng=${longitude}&order=distance&handle_type=ALL&immediate=${immediate}&_=${Date.now()}`;
    return $.getJSON(url);
  }

  async function getLocation() {
    const __default = { coords: { latitude: 37.564545, longitude: 126.975166 } };

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
      setTimeout(() => resolve(__default), 2000);
    });
  }

  async function initMap(coords) {

    /**
     * map
     */
    let container = document.getElementById('map');
    let options = {
      center: new daum.maps.LatLng(coords.latitude, coords.longitude),
      level: 5,
    };
    const map = new daum.maps.Map(container, options);

    /**
     * timepicker
     */
    const { from, to } = {
      from: $('input[name="time_from"]'),
      to: $('input[name="time_to"]'),
    };

    function onChangeTime() {
      filterList(from.timepicker('getTime').getTime() / 1000, (to.timepicker('getTime') || from.timepicker('getTime')).getTime() / 1000, map, handleList);
    }

    from.timepicker({ 'scrollDefault': 'now' });
    to.timepicker({ 'scrollDefault': 'now' });
    from.on('changeTime', onChangeTime);
    to.on('changeTime', onChangeTime);

    /**
     * api_key
     */
    if (window.localStorage) {
      const keyEntry = $('input[name="api_key"]');
      keyEntry.change(function() {
        window.localStorage.__keyEntry = keyEntry.val();
      });
      keyEntry.val(window.localStorage.__keyEntry);
    }

    return map;
  }

  async function loadHandles(map, coords) {
    const apiKey = $('input[name="api_key"]').val();
    if (!apiKey) return alert('please enter an API key.');

    const { retCode, retMsg, result } = await getSocarData(apiKey, coords);
    if (retCode === '1') {
      const parsedResult = result.map(r => parseSocarItem(r));
      console.log(parsedResult);
      renderList(parsedResult);
      renderMap(map, parsedResult);
      return parsedResult;
    } else {
      alert(retMsg);
      return [];
    }
  }

  const { coords } = await getLocation();
  const map = await initMap(coords);
  let handleList = await loadHandles(map, coords);

  $('#query').on('click', async function() {
    handleList = await loadHandles(map, coords);
  });

})();