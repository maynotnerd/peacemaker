const dateTime = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Asia/Yekaterinburg'
});

export const statusLabels = {
  submitted: 'Подана',
  review: 'На рассмотрении',
  needs_info: 'Требует дополнения',
  completed: 'Завершена'
};

export const formatTime = (value) => dateTime.format(new Date(value));
export const formatDate = (value) => value.split('-').reverse().join('.');
export const yesNo = (value) => value ? 'Да' : 'Нет';
