import React from 'react';
import { Opinion } from '../types';

interface StarRatingProps {
  opiniones: Opinion[];
  showText?: boolean;
}

const StarIcon: React.FC<{ filled: boolean }> = ({ filled }) => (
  <svg
    className={`w-5 h-5 ${filled ? 'text-yellow-400' : 'text-gray-300'}`}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const StarRating: React.FC<StarRatingProps> = ({ opiniones, showText = true }) => {
  if (!opiniones || opiniones.length === 0) {
    return (
      <div className="flex items-center">
        <div className="flex">
          {[...Array(5)].map((_, i) => (
            <StarIcon key={i} filled={false} />
          ))}
        </div>
        {showText && <p className="ml-2 text-sm text-gray-400">Sin opiniones</p>}
      </div>
    );
  }

  const average = opiniones.reduce((acc, curr) => acc + curr.rating, 0) / opiniones.length;
  const roundedAverage = Math.round(average);

  return (
    <div className="flex items-center">
      <div className="flex" aria-label={`Calificación de ${average.toFixed(1)} de 5 estrellas`}>
        {[...Array(5)].map((_, i) => (
          <StarIcon key={i} filled={i < roundedAverage} />
        ))}
      </div>
      {showText && (
        <p className="ml-2 text-sm text-gray-600">
          {average.toFixed(1)} ({opiniones.length} {opiniones.length === 1 ? 'opinión' : 'opiniones'})
        </p>
      )}
    </div>
  );
};

export default StarRating;