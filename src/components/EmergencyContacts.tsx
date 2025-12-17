import React, { useEffect, useState } from 'react';

interface Contact {
  id: number;
  name: string;
  phone: string;
}

const EmergencyContacts: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch emergency contacts from backend/mock API
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setLoading(true);
        setError(null);
        // Replace the URL below with your actual backend endpoint or mock API URL
        const response = await fetch('https://api.example.com/emergency-contacts');
        if (!response.ok) {
          throw new Error('Failed to fetch emergency contacts');
        }
        const data = await response.json();
        setContacts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, []);

  // Add new emergency contact
  const addContact = async (newContact: Omit<Contact, 'id'>) => {
    try {
      // Replace the URL below with your actual backend endpoint or mock API URL
      const response = await fetch('https://api.example.com/emergency-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newContact),
      });

      if (!response.ok) {
        throw new Error('Failed to add contact');
      }

      const createdContact = await response.json();
      setContacts((prevContacts) => [...prevContacts, createdContact]);
    } catch (err) {
      setError(err.message);
    }
  };

  // Delete an emergency contact
  const deleteContact = async (id: number) => {
    try {
      // Replace the URL below with your actual backend endpoint or mock API URL
      const response = await fetch(`https://api.example.com/emergency-contacts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete contact');
      }

      setContacts((prevContacts) => prevContacts.filter((contact) => contact.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Emergency Contacts</h1>
      <ul>
        {contacts.map((contact) => (
          <li key={contact.id}>
            {contact.name} - {contact.phone}
            <button onClick={() => deleteContact(contact.id)}>Delete</button>
          </li>
        ))}
      </ul>
      <button onClick={() => addContact({ name: 'New Contact', phone: '123-456-7890' })}>
        Add Contact
      </button>
    </div>
  );
};

export default EmergencyContacts;