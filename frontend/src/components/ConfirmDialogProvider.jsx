'use client';

import React, { createContext, useContext, useState } from 'react';
import ConfirmModal from './ConfirmModal';

const ConfirmContext = createContext();

export function ConfirmProvider({ children }) {
  const [options, setOptions] = useState(null);
  const [resolver, setResolver] = useState(null);

  function confirm({ title, message }) {
    setOptions({ title, message });

    return new Promise((resolve) => {
      setResolver(() => resolve);
    });
  }

  function handleConfirm() {
    if (resolver) resolver(true);
    cleanup();
  }

  function handleCancel() {
    if (resolver) resolver(false);
    cleanup();
  }

  function cleanup() {
    setOptions(null);
    setResolver(null);
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      <ConfirmModal
        open={!!options}
        title={options?.title}
        message={options?.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}
