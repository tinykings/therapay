import React from 'react';
import { Card } from 'react-bootstrap';

function TaxEstimateCard({ totalIncome, totalDeductions, tax }) {
  return (
    <Card bg="info" text="white" className="mb-3">
      <Card.Header>Tax Estimate</Card.Header>
      <Card.Body>
        <div className="small">
          <div className="d-flex justify-content-between">
            <span>Gross Income:</span>
            <span>${totalIncome.toFixed(2)}</span>
          </div>
          <div className="d-flex justify-content-between">
            <span>Deductions:</span>
            <span>-${totalDeductions.toFixed(2)}</span>
          </div>
          <hr className="my-1 border-white" />
          <div className="d-flex justify-content-between fw-bold">
            <span>Net Income:</span>
            <span>${tax.netIncome.toFixed(2)}</span>
          </div>
          <div className="d-flex justify-content-between">
            <span>Est. SE Tax:</span>
            <span>${tax.seTax.toFixed(2)}</span>
          </div>
          <div className="d-flex justify-content-between">
            <span>Est. Income Tax:</span>
            <span>${tax.incomeTax.toFixed(2)}</span>
          </div>
          <hr className="my-1 border-white" />
          <div className="d-flex justify-content-between fw-bold">
            <span>Total Est. Tax:</span>
            <span>${tax.totalTax.toFixed(2)}</span>
          </div>
          {tax.suggestedExtra > 0 && (
            <div className="d-flex justify-content-between mt-1 fw-bold" style={{ color: '#ffe0b2' }}>
              <span>Suggested Addl. Deductions:</span>
              <span>${tax.suggestedExtra.toLocaleString()}</span>
            </div>
          )}
        </div>
        <div className="mt-2" style={{ fontSize: '0.7rem', opacity: 0.8 }}>
          Estimate only — not tax advice
        </div>
      </Card.Body>
    </Card>
  );
}

export default TaxEstimateCard;
