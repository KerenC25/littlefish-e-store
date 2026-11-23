import { emptyRegisterValues, passwordProblem, utf8Length, validateRegister } from './registerForm';

const valid = { firstName: 'Thandi', lastName: 'Nkosi', email: 'thandi@example.test', password: 'braai2026', confirmPassword: 'braai2026' };

describe('register form validation', () => {
  it('accepts a complete, valid form', () => {
    expect(validateRegister(valid)).toEqual({});
  });

  it('flags every empty field', () => {
    expect(Object.keys(validateRegister(emptyRegisterValues))).toEqual(['firstName', 'lastName', 'email', 'password', 'confirmPassword']);
  });

  it('treats whitespace-only names as empty', () => {
    expect(validateRegister({ ...valid, firstName: '   ' }).firstName).toBe('Enter your first name');
  });

  it('rejects malformed email and mismatched confirmation', () => {
    const errors = validateRegister({ ...valid, email: 'thandi@', confirmPassword: 'braai2027' });
    expect(errors.email).toMatch(/does not look right/);
    expect(errors.confirmPassword).toBe('The passwords do not match');
  });

  it.each([
    ['', 'Choose a password'],
    ['ab1', 'Use at least 8 characters'],
    ['onlyletters', 'Mix in at least one letter and one number'],
    ['12345678', 'Mix in at least one letter and one number'],
    ['a1'.repeat(37), 'Keep it under 72 characters'],
  ])('password %p -> %p', (password, message) => {
    expect(passwordProblem(password)).toBe(message);
  });

  it('accepts non-English letters', () => {
    expect(passwordProblem('Ŋwanaŋwana9')).toBeUndefined();
  });

  it('counts bytes as bcrypt does', () => {
    expect(utf8Length('a')).toBe(1);
    expect(utf8Length('é')).toBe(2);
    expect(utf8Length('€')).toBe(3);
    expect(utf8Length('🐟')).toBe(4);
  });
});
