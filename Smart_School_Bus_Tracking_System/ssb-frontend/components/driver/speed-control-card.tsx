"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Gauge } from "lucide-react";

interface SpeedControlCardProps {
  currentSpeed: number;
  onSpeedChange: (speed: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export function SpeedControlCard({
  currentSpeed,
  onSpeedChange,
  min = 10,
  max = 120,
  disabled = false,
}: SpeedControlCardProps) {
  const [inputValue, setInputValue] = useState<string>(currentSpeed.toString());
  const [isEditing, setIsEditing] = useState(false);

  // Sync input value when currentSpeed changes externally
  useEffect(() => {
    if (!isEditing) {
      setInputValue(currentSpeed.toString());
    }
  }, [currentSpeed, isEditing]);

  const handleSliderChange = useCallback(
    (values: number[]) => {
      const newSpeed = values[0];
      setInputValue(newSpeed.toString());
      onSpeedChange(newSpeed);
    },
    [onSpeedChange]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);
      setIsEditing(true);

      // Parse and validate
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= min && numValue <= max) {
        onSpeedChange(numValue);
      }
    },
    [onSpeedChange, min, max]
  );

  const handleInputBlur = useCallback(() => {
    setIsEditing(false);
    const numValue = parseFloat(inputValue);
    
    // Clamp to valid range
    if (isNaN(numValue) || numValue < min) {
      const clampedValue = min;
      setInputValue(clampedValue.toString());
      onSpeedChange(clampedValue);
    } else if (numValue > max) {
      const clampedValue = max;
      setInputValue(clampedValue.toString());
      onSpeedChange(clampedValue);
    } else {
      onSpeedChange(numValue);
    }
  }, [inputValue, onSpeedChange, min, max]);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.currentTarget.blur();
      }
    },
    []
  );

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="w-5 h-5" />
          Điều khiển tốc độ mô phỏng
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="speed-input">Tốc độ (km/h)</Label>
          <div className="flex items-center gap-3">
            <Input
              id="speed-input"
              type="number"
              min={min}
              max={max}
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              disabled={disabled}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">km/h</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Điều chỉnh tốc độ</Label>
            <span className="text-sm font-medium text-primary">
              {currentSpeed} km/h
            </span>
          </div>
          <Slider
            value={[currentSpeed]}
            onValueChange={handleSliderChange}
            min={min}
            max={max}
            step={1}
            disabled={disabled}
            className="w-full"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{min} km/h</span>
            <span>{max} km/h</span>
          </div>
        </div>

        {disabled && (
          <p className="text-xs text-muted-foreground">
            Mô phỏng chưa được khởi động
          </p>
        )}
      </CardContent>
    </Card>
  );
}

