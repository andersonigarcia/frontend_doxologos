function toCents(value) {
    if (value === null || value === undefined || value === '') return 0;

    if (typeof value === 'number') {
        if (!Number.isFinite(value)) return 0;
        return Math.round(value * 100);
    }

    let str = String(value).trim();
    str = str.replace(/[R$\s]/g, '');

    const hasDot = str.includes('.');
    const hasComma = str.includes(',');

    if (hasComma && hasDot) {
        str = str.replace(/\./g, '').replace(',', '.');
    } else if (hasComma && !hasDot) {
        str = str.replace(',', '.');
    }

    const parsed = parseFloat(str);
    if (!Number.isFinite(parsed)) return 0;
    return Math.round(parsed * 100);
}

function fromCents(cents) {
    return Number((Math.round(cents) / 100).toFixed(2));
}

function sumMoney(arr, fn) {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    const totalCents = arr.reduce((sum, item) => sum + toCents(fn(item)), 0);
    return fromCents(totalCents);
}

const data = [
  { val: null },
  { val: undefined },
  { val: NaN },
  { val: 'NaN' },
  { val: {} },
  { val: [] },
  { val: '10.00' }
];

console.log('Testing Edge Cases:');
for (const item of data) {
    console.log(item.val, '=>', toCents(item.val));
}

console.log('sumMoney test:', sumMoney([{val: '10'}, {val: NaN}], x => x.val));

