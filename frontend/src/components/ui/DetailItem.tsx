import React from 'react';

interface DetailItemProps {
  label: string;
  children: React.ReactNode;
}

const DetailItem: React.FC<DetailItemProps> = ({ label, children }) => (
  <p className="text-sm text-slate-700">
    <span className="font-semibold text-slate-800">{label}:</span> {children}
  </p>
);

export default DetailItem; 