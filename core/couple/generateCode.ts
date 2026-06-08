// BR-2: 6자리 대문자 영숫자. 0/O/I/1 제외(가독성).
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}
