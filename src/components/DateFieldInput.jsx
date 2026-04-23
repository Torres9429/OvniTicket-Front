import PropTypes from 'prop-types';
import {
  DatePicker,
  DateField,
  TimeField,
  Calendar,
  Description,
  FieldError,
  Label,
  Input,
} from '@heroui/react';
import { parseDate, parseTime } from '@internationalized/date';

const formatReadableDate = (dateString) => {
  if (!dateString) return null;
  const isDatetime = dateString.includes('T');
  const dateWithTime = isDatetime ? dateString : dateString + 'T12:00:00';
  const date = new Date(dateWithTime);
  const options = isDatetime
    ? { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'long', year: 'numeric' };
  return date.toLocaleDateString('es-MX', options);
};

export default function DateFieldInput({
  label = 'Fecha',
  value = null,
  onChange,
  onBlur,
  error = null,
  isRequired = false,
  placeholder = 'Selecciona una fecha',
  minDate = null,
  maxDate = null,
  disabled = false,
  showTime = false,
}) {
  const handleDateChange = (val) => {
    if (onChange) {
      if (showTime && value && value.includes('T')) {
        // Mantener la hora cuando se cambia solo la fecha
        const timePart = value.split('T')[1];
        onChange(val ? val.toString() + 'T' + timePart : '');
      } else if (showTime) {
        // Si no hay hora aún, usar 00:00
        onChange(val ? val.toString() + 'T00:00' : '');
      } else {
        onChange(val ? val.toString() : '');
      }
    }
  };

  const handleTimeChange = (val) => {
    if (onChange && value) {
      const datePart = value.split('T')[0];
      onChange(datePart + 'T' + val.toString());
    }
  };

  const parsedDate = value ? parseDate(value.split('T')[0]) : null;
  const parsedTime = value && value.includes('T') ? parseTime(value.split('T')[1]) : null;

  return (
    <div className="flex flex-col gap-2 w-full">
      <DatePicker
        value={parsedDate}
        onChange={handleDateChange}
        isDisabled={disabled}
      >
        <Label>
          {label}
          {isRequired && <span className="text-danger"> *</span>}
        </Label>
        <DateField.Group variant="secondary">
          <DateField.Input>
            {(segment) => <DateField.Segment segment={segment} />}
          </DateField.Input>
          <DateField.Suffix>
            <DatePicker.Trigger>
              <DatePicker.TriggerIndicator />
            </DatePicker.Trigger>
          </DateField.Suffix>
        </DateField.Group>

        {error && <FieldError>{error}</FieldError>}

        {!error && (
          <Description className="text-xs text-muted">
            {value
              ? formatReadableDate(value)
              : placeholder}
          </Description>
        )}

        <DatePicker.Popover>
          <Calendar aria-label="Seleccionar fecha">
            <Calendar.Header>
              <Calendar.YearPickerTrigger>
                <Calendar.YearPickerTriggerHeading />
                <Calendar.YearPickerTriggerIndicator />
              </Calendar.YearPickerTrigger>
              <Calendar.NavButton slot="previous" />
              <Calendar.NavButton slot="next" />
            </Calendar.Header>
            <Calendar.Grid>
              <Calendar.GridHeader>
                {(day) => (
                  <Calendar.HeaderCell>{day}</Calendar.HeaderCell>
                )}
              </Calendar.GridHeader>
              <Calendar.GridBody>
                {(date) => <Calendar.Cell date={date} />}
              </Calendar.GridBody>
            </Calendar.Grid>
          </Calendar>
        </DatePicker.Popover>
      </DatePicker>

      {showTime && (
        <TimeField
          value={parsedTime}
          onChange={handleTimeChange}
          isDisabled={disabled || !parsedDate}
        >
          <Label>Hora</Label>
          <TimeField.Group variant="secondary">
            <TimeField.Input>
              {(segment) => <TimeField.Segment segment={segment} />}
            </TimeField.Input>
          </TimeField.Group>
        </TimeField>
      )}
    </div>
  );
}

DateFieldInput.propTypes = {
  label: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func,
  error: PropTypes.string,
  isRequired: PropTypes.bool,
  placeholder: PropTypes.string,
  minDate: PropTypes.string,
  maxDate: PropTypes.string,
  disabled: PropTypes.bool,
  showTime: PropTypes.bool,
};
