export function computeTax(grossIncome, totalDeductions) {
  const netIncome = Math.max(0, grossIncome - totalDeductions);

  // Self-employment tax: 15.3% on 92.35% of net income
  const seBase = netIncome * 0.9235;
  const seTax = seBase * 0.153;

  // Deductible half of SE tax
  const seDeduction = seTax / 2;

  // Income tax (single filer, 2025 approx brackets after ~$15,000 standard deduction)
  const standardDeduction = 15000;
  const taxableIncome = Math.max(0, netIncome - seDeduction - standardDeduction);

  const brackets = [
    { limit: 11925, rate: 0.10 },
    { limit: 48475, rate: 0.12 },
    { limit: 103350, rate: 0.22 },
    { limit: 191950, rate: 0.24 },
    { limit: 243725, rate: 0.32 },
    { limit: 609350, rate: 0.35 },
    { limit: Infinity, rate: 0.37 },
  ];

  let incomeTax = 0;
  let remaining = taxableIncome;
  let prevLimit = 0;
  for (const bracket of brackets) {
    const width = bracket.limit - prevLimit;
    const taxable = Math.min(remaining, width);
    incomeTax += taxable * bracket.rate;
    remaining -= taxable;
    prevLimit = bracket.limit;
    if (remaining <= 0) break;
  }

  const totalTax = seTax + incomeTax;
  return { netIncome, seTax, incomeTax, totalTax };
}

export function calculateTaxEstimate(grossIncome, totalDeductions) {
  const result = computeTax(grossIncome, totalDeductions);

  // Binary search for suggested additional deductions to bring tax near $0
  let suggestedExtra = 0;
  if (result.totalTax > 0) {
    let lo = 0;
    let hi = result.netIncome;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      const test = computeTax(grossIncome, totalDeductions + mid);
      if (test.totalTax > 1) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    suggestedExtra = Math.ceil(hi);
  }

  return { ...result, suggestedExtra };
}
