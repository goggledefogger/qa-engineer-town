import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // Add other props as needed, e.g., label, error, etc.
}

const Input: React.FC<InputProps> = ({ className = '', ...props }) => {
  const baseStyle =
    'border border-slate-300 rounded-md py-2 px-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm placeholder-slate-400';

  return (
    <input
      className={`${baseStyle} ${className}`.trim()}
      {...props}
    />
  );
};

export default Input;
