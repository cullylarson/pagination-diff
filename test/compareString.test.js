import {compareString} from '../esm/'

test('First less than second (1).', () => {
    expect(compareString('A', 'B')).toBe(-1)
})

test('First less than second (2).', () => {
    expect(compareString('A12B', 'A13C')).toBe(-1)
})

test('Second less than first (1).', () => {
    expect(compareString('ggg', 'bbbbbbbb')).toBe(1)
})

test('Second less than first (2).', () => {
    expect(compareString('AAAAA3', 'AAAAA2')).toBe(1)
})

test('First and second equal.', () => {
    expect(compareString('A12aZ', 'A12aZ')).toBe(0)
})
