import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Button, Table, Form, Row, Col, Alert, Badge } from 'react-bootstrap';
import { useData } from '../context/DataContext';

function ClientDetails() {
  const { id } = useParams();
  const { data, addSession } = useData();
  const client = data.clients.find(c => c.id === id);

  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionAmount, setSessionAmount] = useState(70);
  const [showAddForm, setShowAddForm] = useState(false);

  if (!client) {
    return <Alert variant="secondary">Client not found or loading... <Link to="/">Go back</Link></Alert>;
  }

  const handleAddSession = (e) => {
    e.preventDefault();
    addSession(client.id, {
      date: sessionDate,
      amount: parseFloat(sessionAmount)
    });
    setShowAddForm(false);
    // Reset defaults (keep date as is or reset? Resetting is usually better for rapid entry of different days, but staying is good for bulk entry. I'll reset amount but keep date for now or reset date to today).
    // Let's reset to defaults for clean state.
    setSessionDate(new Date().toISOString().split('T')[0]);
    setSessionAmount(70);
  };

  const totalClientIncome = (client.sessions || []).reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

  return (
    <div>
      <div className="mb-4">
        <Link to="/" className="btn btn-outline-secondary mb-2">&larr; Back to Dashboard</Link>
        <div className="d-flex justify-content-between align-items-center">
          <h2>{client.name}</h2>
          <Badge bg="info" className="p-2 fs-6">Total: ${totalClientIncome.toFixed(2)}</Badge>
        </div>
      </div>

      <Button variant="primary" className="mb-3" onClick={() => setShowAddForm(!showAddForm)}>
        {showAddForm ? 'Cancel' : '+ Add Session'}
      </Button>

      {showAddForm && (
        <Card className="mb-4 bg-light">
          <Card.Body>
            <Card.Title>New Session</Card.Title>
            <Form onSubmit={handleAddSession}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Date</Form.Label>
                    <Form.Control 
                      type="date" 
                      value={sessionDate}
                      onChange={(e) => setSessionDate(e.target.value)}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Amount ($)</Form.Label>
                    <Form.Control 
                      type="number" 
                      step="0.01"
                      value={sessionAmount}
                      onChange={(e) => setSessionAmount(e.target.value)}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Button type="submit" variant="success">Save Session</Button>
            </Form>
          </Card.Body>
        </Card>
      )}

      <Card>
        <Card.Header>Session History</Card.Header>
        <Table responsive hover className="mb-0">
          <thead>
            <tr>
              <th>Date</th>
              <th className="text-end">Amount</th>
            </tr>
          </thead>
          <tbody>
            {!client.sessions || client.sessions.length === 0 ? (
              <tr>
                <td colSpan="2" className="text-center text-muted">No sessions recorded.</td>
              </tr>
            ) : (
              client.sessions.map((session) => (
                <tr key={session.id}>
                  <td>{new Date(session.date).toLocaleDateString()}</td>
                  <td className="text-end">${parseFloat(session.amount).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

export default ClientDetails;
