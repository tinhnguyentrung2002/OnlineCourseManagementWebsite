import React, { createContext, useContext } from 'react';

const UserContext = createContext();

export const UserProvider = ({ uid, children }) => {
  return (
    <UserContext.Provider value={uid}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);