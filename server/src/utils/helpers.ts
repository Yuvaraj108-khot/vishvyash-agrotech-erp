const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertGroup(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertGroup(n % 100) : '');
}

export function numberToWords(num: number): string {
  if (num === 0) return 'INR Zero Rupees Only';

  const isNegative = num < 0;
  num = Math.abs(Math.round(num * 100) / 100);

  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);

  if (intPart === 0 && decPart === 0) return 'INR Zero Rupees Only';

  let result = '';

  // Indian number system: Crore, Lakh, Thousand, Hundred
  if (intPart >= 10000000) {
    result += convertGroup(Math.floor(intPart / 10000000)) + ' Crore ';
  }
  const afterCrore = intPart % 10000000;

  if (afterCrore >= 100000) {
    result += convertGroup(Math.floor(afterCrore / 100000)) + ' Lakh ';
  }
  const afterLakh = afterCrore % 100000;

  if (afterLakh >= 1000) {
    result += convertGroup(Math.floor(afterLakh / 1000)) + ' Thousand ';
  }
  const afterThousand = afterLakh % 1000;

  if (afterThousand > 0) {
    result += convertGroup(afterThousand);
  }

  result = result.trim();

  if (decPart > 0) {
    result += ' Rupees and ' + convertGroup(decPart) + ' Paise';
  } else {
    result += ' Rupees';
  }

  if (isNegative) {
    result = 'Minus ' + result;
  }

  return 'INR ' + result + ' Only';
}

export function getFinancialYear(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed: 3 = April
  let startYear = year;
  if (month < 3) {
    startYear = year - 1;
  }
  const endYear = startYear + 1;
  const startYearStr = String(startYear).slice(-2);
  const endYearStr = String(endYear).slice(-2);
  return `${startYearStr}-${endYearStr}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function generateInvoiceNumber(counter: number): string {
  return `VAE/INV/${String(counter).padStart(4, '0')}`;
}
