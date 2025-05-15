import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title?: string;
}

const Card: React.FC<CardProps> = ({ children, title, className = '', ...props }) => {
  const baseStyle = 'bg-white shadow-md rounded-lg p-4 md:p-6';

  return (
    <div className={`${baseStyle} ${className}`.trim()} {...props}>
      {title && <h2 className="text-xl font-semibold text-slate-800 mb-4">{title}</h2>}
      {children}
    </div>
  );
};

export default Card;
