'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';

interface WaitlistEntry {
  id: string;
  full_name: string;
  email: string;
  company: string;
  team_size?: string;
  priority?: string;
}

export default function WaitlistAdmin() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/waitlist');
      const data = await response.json();
      
      if (data.success) {
        setEntries(data.entries || []);
      } else {
        setError(data.error || 'Failed to fetch entries');
      }
    } catch {
      setError('Error loading waitlist entries');
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className={styles.container}>
        <h1>Waitlist Admin</h1>
        <p>Loading entries...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <h1>Waitlist Admin</h1>
        <p className={styles.error}>Error: {error}</p>
        <button onClick={fetchEntries}>Retry</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Waitlist Entries</h1>
        <div className={styles.stats}>
          <span>Total: {entries.length}</span>
          <button onClick={fetchEntries}>Refresh</button>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className={styles.empty}>No entries yet.</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Company</th>
                <th>Team Size</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.full_name}</td>
                  <td>
                    <a href={`mailto:${entry.email}`}>{entry.email}</a>
                  </td>
                  <td>{entry.company}</td>
                  <td>{entry.team_size || '-'}</td>
                  <td>{entry.priority || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

