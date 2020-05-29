import {compareInt} from '../esm/'

test('First less than second.', () => {
    expect(compareInt(3, 4)).toBe(-1)
})

test('Second less than first.', () => {
    expect(compareInt(155, 135)).toBe(1)
})

test('First and second equal.', () => {
    expect(compareInt(123, 123)).toBe(0)
})

test('Integer string, first less than second.', () => {
    expect(compareInt('3', '4')).toBe(-1)
})

test('Integer string, second less than first.', () => {
    expect(compareInt('155', '135')).toBe(1)
})

test('Integer string, first and second equal.', () => {
    expect(compareInt('123', '123')).toBe(0)
})
