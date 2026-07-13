import React, { createContext, useState, useContext } from 'react';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  // Simple mock role state: default to 'user'
  const [role, setRole] = useState('user'); 

  const toggleRole = () => {
    setRole((prev) => (prev === 'user' ? 'manager' : 'user'));
  };

  return (
    <UserContext.Provider value={{ role, setRole, toggleRole }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
