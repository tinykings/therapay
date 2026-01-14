import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, ListGroup, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useData } from '../context/DataContext';

function Dashboard() {
  const { data, loading, error, settings, addClient, deleteClient } = useData();
  const [newClientName, setNewClientName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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

  // Calculate available years
  const availableYears = new Set([new Date().getFullYear()]);
  data.clients.forEach(client => {
    if (client.sessions) {
      client.sessions.forEach(session => {
        availableYears.add(new Date(session.date).getFullYear());
      });
    }
  });
  const sortedYears = Array.from(availableYears).sort((a, b) => b - a);

  // Calculate Total Income for selected year
  let totalIncome = 0;
  
  data.clients.forEach(client => {
    if (client.sessions) {
      client.sessions.forEach(session => {
        if (new Date(session.date).getFullYear() === parseInt(selectedYear)) {
          totalIncome += parseFloat(session.amount) || 0;
        }
      });
    }
  });

  // Process and sort clients
  const processedClients = data.clients.map(client => {
    let lastSession = null;
    let yearTotal = 0;

    if (client.sessions && client.sessions.length > 0) {
      // Find most recent session
      // Create a copy to sort safely
      const sortedSessions = [...client.sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
      lastSession = sortedSessions[0];

      // Calculate total for selected year
      client.sessions.forEach(session => {
        if (new Date(session.date).getFullYear() === parseInt(selectedYear)) {
          yearTotal += parseFloat(session.amount) || 0;
        }
      });
    }
    return { ...client, lastSession, yearTotal };
  });

  const sortedClients = processedClients.sort((a, b) => {
    const dateA = a.lastSession ? new Date(a.lastSession.date).getTime() : 0;
    const dateB = b.lastSession ? new Date(b.lastSession.date).getTime() : 0;
    
    if (dateA !== dateB) {
      return dateB - dateA; // Newest first
    }
    return a.name.localeCompare(b.name); // Alphabetical fallback
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
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>Total Income</span>
              <Form.Select 
                size="sm" 
                style={{ width: 'auto', color: 'black' }} // Force text color for visibility
                value={selectedYear} 
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              >
                {sortedYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </Form.Select>
            </Card.Header>
            <Card.Body>
              <Card.Title className="display-4">${totalIncome.toFixed(2)}</Card.Title>
            </Card.Body>
          </Card>
          <Button variant="primary" size="lg" className="w-100" onClick={() => setShowAddForm(!showAddForm)}>
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
      {sortedClients.length === 0 ? (
        <p className="text-muted">No clients yet. Add one to get started.</p>
      ) : (
        <ListGroup>
          {sortedClients.map(client => (
            <ListGroup.Item 
              key={client.id} 
              action 
              as={Link} 
              to={`/client/${client.id}`}
              className="d-flex justify-content-between align-items-center"
            >
              <div>
                <span className="fw-bold d-block">
                  {client.name} 
                  <span className="text-muted fw-normal ms-2 small">
                    ({client.sessions ? client.sessions.length : 0})
                  </span>
                </span>
                {client.lastSession && (
                  <small className="text-muted">
                    Last: {new Date(client.lastSession.date).toLocaleDateString()}
                  </small>
                )}
              </div>
              <div className="d-flex align-items-center">
                 <span className="badge bg-light text-dark border me-3">
                   ${client.yearTotal.toFixed(2)}
                 </span>
                 <Button 
                    variant="outline-danger" 
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (window.confirm(`Are you sure you want to delete ${client.name}?`)) {
                        deleteClient(client.id);
                      }
                    }}
                 >
                    &times;
                 </Button>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
    </div>
  );
}

export default Dashboard;
