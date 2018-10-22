# sohandles

- 쏘카 '쏘포터즈 핸들' 시각화 프로그램

## How to use (https://handles.suseme.me)

1. http://app.socar.kr 에 접속하여 로그인합니다.
2. 다음 코드를 주소에 복사-붙여넣기 합니다.

```javascript
javascript:alert(document.cookie.split(';').find(v => v.includes('auth_token=')).trim().replace('auth_token=', ''))
```

3. 프로그램을 실행시키고 맨 위의 API Key: 입력 칸에 경고창에 뜬 문자열을 붙여넣으면 됩니다.

* 주의) **경고창에 뜬 문자는 절대 다른 사람들에게 공유하지 마세요!** 이걸 공유한다면 갑자기 여러분들의 계정으로 쏘카가 예약될 수도 있습니다.

## How to contribute

Pull Request 및 기여는 언제나 환영합니다.

## Licensing

[BSD 2-Clause](https://opensource.org/licenses/BSD-2-Clause)
