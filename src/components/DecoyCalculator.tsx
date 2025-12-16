import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface DecoyCalculatorProps {
  onSecretTap: () => void;
  gestureProgress: number;
}

export function DecoyCalculator({ onSecretTap, gestureProgress }: DecoyCalculatorProps) {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputDigit = useCallback((digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  }, [display, waitingForOperand]);

  const inputDecimal = useCallback(() => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  }, [display, waitingForOperand]);

  const clear = useCallback(() => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  }, []);

  const performOperation = useCallback((nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      let newValue = currentValue;

      switch (operation) {
        case '+':
          newValue = currentValue + inputValue;
          break;
        case '-':
          newValue = currentValue - inputValue;
          break;
        case '×':
          newValue = currentValue * inputValue;
          break;
        case '÷':
          newValue = inputValue !== 0 ? currentValue / inputValue : 0;
          break;
      }

      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  }, [display, operation, previousValue]);

  const calculate = useCallback(() => {
    if (operation === null || previousValue === null) return;

    const inputValue = parseFloat(display);
    let newValue = previousValue;

    switch (operation) {
      case '+':
        newValue = previousValue + inputValue;
        break;
      case '-':
        newValue = previousValue - inputValue;
        break;
      case '×':
        newValue = previousValue * inputValue;
        break;
      case '÷':
        newValue = inputValue !== 0 ? previousValue / inputValue : 0;
        break;
    }

    setDisplay(String(newValue));
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(true);
  }, [display, operation, previousValue]);

  const toggleSign = useCallback(() => {
    const value = parseFloat(display);
    setDisplay(String(value * -1));
  }, [display]);

  const percentage = useCallback(() => {
    const value = parseFloat(display);
    setDisplay(String(value / 100));
  }, [display]);

  const CalcButton = ({ 
    children, 
    onClick, 
    className = '',
    isOperation = false,
    isZero = false,
  }: { 
    children: React.ReactNode; 
    onClick: () => void; 
    className?: string;
    isOperation?: boolean;
    isZero?: boolean;
  }) => (
    <Button
      onClick={onClick}
      variant="outline"
      className={`
        h-16 text-xl font-medium rounded-full
        ${isZero ? 'col-span-2 justify-start pl-7' : ''}
        ${isOperation ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500' : 'bg-muted/50 hover:bg-muted'}
        ${className}
      `}
    >
      {children}
    </Button>
  );

  return (
    <div 
      className="min-h-screen bg-black flex flex-col p-4"
      onClick={onSecretTap}
    >
      {/* Secret gesture progress indicator - very subtle */}
      {gestureProgress > 0 && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gray-700" 
          style={{ opacity: gestureProgress / 100 * 0.5 }} 
        />
      )}

      {/* Display */}
      <div className="flex-1 flex items-end justify-end p-4 mb-2">
        <div className="text-white text-6xl font-light tracking-tight truncate max-w-full">
          {display.length > 9 ? parseFloat(display).toExponential(5) : display}
        </div>
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-4 gap-3">
        <CalcButton onClick={clear} className="bg-gray-400 hover:bg-gray-500 text-black">
          {display === '0' ? 'AC' : 'C'}
        </CalcButton>
        <CalcButton onClick={toggleSign} className="bg-gray-400 hover:bg-gray-500 text-black">
          +/-
        </CalcButton>
        <CalcButton onClick={percentage} className="bg-gray-400 hover:bg-gray-500 text-black">
          %
        </CalcButton>
        <CalcButton onClick={() => performOperation('÷')} isOperation>
          ÷
        </CalcButton>

        <CalcButton onClick={() => inputDigit('7')}>7</CalcButton>
        <CalcButton onClick={() => inputDigit('8')}>8</CalcButton>
        <CalcButton onClick={() => inputDigit('9')}>9</CalcButton>
        <CalcButton onClick={() => performOperation('×')} isOperation>
          ×
        </CalcButton>

        <CalcButton onClick={() => inputDigit('4')}>4</CalcButton>
        <CalcButton onClick={() => inputDigit('5')}>5</CalcButton>
        <CalcButton onClick={() => inputDigit('6')}>6</CalcButton>
        <CalcButton onClick={() => performOperation('-')} isOperation>
          −
        </CalcButton>

        <CalcButton onClick={() => inputDigit('1')}>1</CalcButton>
        <CalcButton onClick={() => inputDigit('2')}>2</CalcButton>
        <CalcButton onClick={() => inputDigit('3')}>3</CalcButton>
        <CalcButton onClick={() => performOperation('+')} isOperation>
          +
        </CalcButton>

        <CalcButton onClick={() => inputDigit('0')} isZero>
          0
        </CalcButton>
        <CalcButton onClick={inputDecimal}>.</CalcButton>
        <CalcButton onClick={calculate} isOperation>
          =
        </CalcButton>
      </div>

      {/* Hidden hint - very subtle */}
      <div className="mt-4 text-center">
        <p className="text-gray-800 text-xs">
          tap-tap-doubletap-tap to exit
        </p>
      </div>
    </div>
  );
}
