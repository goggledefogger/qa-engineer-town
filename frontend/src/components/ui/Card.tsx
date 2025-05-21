import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title?: string;
}

const Card: React.FC<CardProps> = ({ children, title, className = '', ...props }) => {
  // Responsive, consistent, and composable card style
  const baseStyle =
    'bg-white shadow-md rounded-md sm:rounded-lg p-2 sm:p-4 md:p-6';

  return (
    <div className={`${baseStyle} ${className}`.trim()} {...props}>
      {title && (
        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-800 mb-2 sm:mb-4">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
};

export default Card;
