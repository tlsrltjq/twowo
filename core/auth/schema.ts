import { z } from 'zod';

export const loginSchema = z.object({
  email:    z.string().email('올바른 이메일을 입력해주세요'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
});

export const signUpSchema = z.object({
  displayName: z.string().min(1, '이름을 입력해주세요').max(20, '이름은 20자 이하여야 합니다'),
  email:       z.string().email('올바른 이메일을 입력해주세요'),
  password:    z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
});

export type LoginInput  = z.infer<typeof loginSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
