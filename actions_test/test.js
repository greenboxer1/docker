function sum(a, b) {
    return a + b;
  }
  
test('1 + 1 равно 2', () => {
  expect(sum(1, 1)).toBe(2);
});