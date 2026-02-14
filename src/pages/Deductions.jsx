import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Table, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useData } from '../context/DataContext';

const CATEGORIES = [
  'Office Supplies',
  'Software & Subscriptions',
  'Continuing Education',
  'Professional Memberships',
  'Insurance (Business)',
  'Marketing & Advertising',
  'Office Rent/Space',
  'Utilities',
  'Travel & Mileage',
  'Equipment',
  'Phone & Internet',
  'Other',
];

function computeTax(grossIncome, totalDeductions) {
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

function calculateTaxEstimate(grossIncome, totalDeductions) {
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

function Deductions() {
  const { data, loading, error, settings, addDeduction, deleteDeduction } = useData();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showAddForm, setShowAddForm] = useState(false);
  const [deductionDate, setDeductionDate] = useState(new Date().toISOString().split('T')[0]);
  const [deductionCategory, setDeductionCategory] = useState(CATEGORIES[0]);
  const [deductionDescription, setDeductionDescription] = useState('');
  const [deductionAmount, setDeductionAmount] = useState('');

  if (!settings.token || !settings.gistId) {
    return (
      <Alert variant="warning">
        Please configure your GitHub Token and Gist ID in <Link to="/settings">Settings</Link> to start.
      </Alert>
    );
  }

  if (loading && data.clients.length === 0) {
    return <div className="text-center"><Spinner animation="border" /></div>;
  }

  // Calculate available years from both sessions and deductions
  const availableYears = new Set([new Date().getFullYear()]);
  data.clients.forEach(client => {
    if (client.sessions) {
      client.sessions.forEach(session => {
        availableYears.add(new Date(session.date + 'T00:00:00').getFullYear());
      });
    }
  });
  (data.deductions || []).forEach(d => {
    availableYears.add(new Date(d.date + 'T00:00:00').getFullYear());
  });
  const sortedYears = Array.from(availableYears).sort((a, b) => b - a);

  // Total income for selected year
  let totalIncome = 0;
  data.clients.forEach(client => {
    if (client.sessions) {
      client.sessions.forEach(session => {
        if (new Date(session.date + 'T00:00:00').getFullYear() === parseInt(selectedYear)) {
          totalIncome += parseFloat(session.amount) || 0;
        }
      });
    }
  });

  // Total deductions for selected year
  const yearDeductions = (data.deductions || []).filter(
    d => new Date(d.date + 'T00:00:00').getFullYear() === parseInt(selectedYear)
  );
  const totalDeductions = yearDeductions.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

  // Tax estimate
  const tax = calculateTaxEstimate(totalIncome, totalDeductions);

  const handleAddDeduction = (e) => {
    e.preventDefault();
    addDeduction({
      date: deductionDate,
      category: deductionCategory,
      description: deductionDescription.trim(),
      amount: parseFloat(deductionAmount),
    });
    setShowAddForm(false);
    setDeductionDate(new Date().toISOString().split('T')[0]);
    setDeductionCategory(CATEGORIES[0]);
    setDeductionDescription('');
    setDeductionAmount('');
  };

  return (
    <div>
      {error && <Alert variant="danger">{error}</Alert>}

      {/* Summary Cards */}
      <Row className="mb-4">
        <Col md={4}>
          <Card bg="success" text="white" className="mb-3">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>Total Income</span>
              <Form.Select
                size="sm"
                style={{ width: 'auto', color: 'black' }}
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              >
                {sortedYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </Form.Select>
            </Card.Header>
            <Card.Body>
              <Card.Title className="display-6">${totalIncome.toFixed(2)}</Card.Title>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card bg="warning" text="dark" className="mb-3">
            <Card.Header>Total Deductions</Card.Header>
            <Card.Body>
              <Card.Title className="display-6">${totalDeductions.toFixed(2)}</Card.Title>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
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
                  <div className="d-flex justify-content-between mt-1 fw-bold" style={{ color: '#ffc107' }}>
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
        </Col>
      </Row>

      {/* Add Deduction Form */}
      <Button variant="primary" className="mb-3" onClick={() => setShowAddForm(!showAddForm)}>
        {showAddForm ? 'Cancel' : '+ Add Deduction'}
      </Button>

      {showAddForm && (
        <Card className="mb-4 bg-light">
          <Card.Body>
            <Card.Title>New Deduction</Card.Title>
            <Form onSubmit={handleAddDeduction}>
              <Row>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={deductionDate}
                      onChange={(e) => setDeductionDate(e.target.value)}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Category</Form.Label>
                    <Form.Select
                      value={deductionCategory}
                      onChange={(e) => setDeductionCategory(e.target.value)}
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                      type="text"
                      value={deductionDescription}
                      onChange={(e) => setDeductionDescription(e.target.value)}
                      placeholder="e.g. Printer paper"
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Amount ($)</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      min="0"
                      value={deductionAmount}
                      onChange={(e) => setDeductionAmount(e.target.value)}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Button type="submit" variant="success">Save Deduction</Button>
            </Form>
          </Card.Body>
        </Card>
      )}

      {/* Deductions Table */}
      <Card>
        <Card.Header>Deductions — {selectedYear}</Card.Header>
        <Table responsive hover className="mb-0">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th className="text-end">Amount</th>
              <th className="text-end" style={{ width: '50px' }}></th>
            </tr>
          </thead>
          <tbody>
            {yearDeductions.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center text-muted">No deductions recorded for {selectedYear}.</td>
              </tr>
            ) : (
              yearDeductions.map((d) => (
                <tr key={d.id}>
                  <td>{new Date(d.date + 'T00:00:00').toLocaleDateString()}</td>
                  <td>{d.category}</td>
                  <td>{d.description}</td>
                  <td className="text-end">${parseFloat(d.amount).toFixed(2)}</td>
                  <td className="text-end">
                    <Button
                      variant="link"
                      className="text-danger p-0"
                      onClick={() => {
                        if (window.confirm('Delete this deduction?')) {
                          deleteDeduction(d.id);
                        }
                      }}
                    >
                      &times;
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

export default Deductions;
