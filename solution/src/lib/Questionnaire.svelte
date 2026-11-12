<script>
  let { countries, questionnaire = {} } = $props();

  const questions = [
    ['highlyQualified', 'Есть статус высококвалифицированного специалиста?'],
    ['familyOfHighlyQualified', 'Вы член семьи высококвалифицированного специалиста?'],
    ['resettlementParticipant', 'Вы участвуете в программе переселения?']
  ];
</script>

<fieldset>
  <legend>Гражданство и въезд</legend>
  <div class="fields">
    <label>
      Гражданство
      <select name="citizenship" required value={questionnaire.citizenship || ''}>
        <option value="">Выберите страну</option>
        {#each Object.entries(countries) as [code, name]}
          <option value={code}>{name}</option>
        {/each}
      </select>
    </label>
    <label>
      Дата въезда в РФ
      <input type="date" name="entryDate" required value={questionnaire.entryDate || ''}>
    </label>
  </div>
</fieldset>

<fieldset>
  <legend>Статус заявителя</legend>
  {#each questions as [key, label]}
    <label>
      {label}
      <select name={key} required value={questionnaire[key] === undefined ? '' : questionnaire[key] ? 'yes' : 'no'}>
        <option value="">Выберите ответ</option>
        <option value="yes">Да</option>
        <option value="no">Нет</option>
      </select>
    </label>
  {/each}
</fieldset>

<fieldset>
  <legend>Вложения</legend>
  <label>
    Подтверждающие документы
    <span class="muted">Необязательно · до 3 файлов по 2 МБ</span>
    <input type="file" name="documents" multiple>
  </label>
</fieldset>
