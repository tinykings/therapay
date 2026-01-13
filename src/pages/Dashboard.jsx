import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, ListGroup, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useData } from '../context/DataContext';

function Dashboard() {
  const { data, loading, error, settings, addClient } = useData();
  const [newClientName, setNewClientName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

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

  // Calculate Total Income for current year
  const currentYear = new Date().getFullYear();
  let totalIncome = 0;
  
  data.clients.forEach(client => {
    if (client.sessions) {
      client.sessions.forEach(session => {
        if (new Date(session.date).getFullYear() === currentYear) {
          totalIncome += parseFloat(session.amount) || 0;
        }
      });
    }
  });

  const handleAddClient = (e) => {
    e.preventDefault();
    if (newClientName.trim()) {
      addClient(newClientName.trim());
      setNewClientName('');
      setShowAddForm(false);
    }
  };

  return (
    <div>
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Row className="mb-4">
        <Col md={6}>
          <Card bg="success" text="white" className="mb-3">
            <Card.Header>Total Income ({currentYear})</Card.Header>
            <Card.Body>
              <Card.Title className="display-4">${totalIncome.toFixed(2)}</Card.Title>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} className="d-flex align-items-center justify-content-end">
           <Button variant="primary" size="lg" onClick={() => setShowAddForm(!showAddForm)}>
             {showAddForm ? 'Cancel' : '+ New Client'}
           </Button>
        </Col>
      </Row>

      {showAddForm && (
        <Card className="mb-4">
          <Card.Body>
            <Card.Title>Add New Client</Card.Title>
            <Form onSubmit={handleAddClient}>
              <Form.Group className="mb-3">
                <Form.Label>Client Name</Form.Label>
                <Form.Control 
                  type="text" 
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Enter name" 
                  autoFocus
                />
              </Form.Group>
              <Button type="submit" variant="primary">Add Client</Button>
            </Form>
          </Card.Body>
        </Card>
      )}

      <h3>Clients</h3>
      {data.clients.length === 0 ? (
        <p className="text-muted">No clients yet. Add one to get started.</p>
      ) : (
        <ListGroup>
          {data.clients.map(client => (
            <ListGroup.Item 
              key={client.id} 
              action 
              as={Link} 
              to={`/client/${client.id}`}
              className="d-flex justify-content-between align-items-center"
            >
              <div>
                <span className="fw-bold">{client.name}</span>
              </div>
              <small className="text-muted">
                {client.sessions ? client.sessions.length : 0} sessions
              </small>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
    </div>
  );
}

export default Dashboard;
