<script>
  import { formatTime, statusLabels } from '$lib/format.js';

  let { rows, specialist, archived } = $props();
  let shown = $derived(archived ? rows.filter(row => row.status === 'completed') : rows);
</script>

<h1>{archived ? 'Оказанные услуги' : specialist ? 'Поступившие заявки' : 'Мои заявки'}</h1>

{#if shown.length}
  <div class="table-wrap">
    <table aria-label="Заявки">
      <thead>
        <tr>
          <th scope="col">Номер</th>
          {#if specialist}<th scope="col">Заявитель</th>{/if}
          <th scope="col">Дата подачи</th>
          <th scope="col">Статус</th>
        </tr>
      </thead>
      <tbody>
        {#each shown as row (row.id)}
          <tr>
            <td><a href={'/?application=' + row.id}>Заявка №{row.id}</a></td>
            {#if specialist}<td>{row.applicant}</td>{/if}
            <td>{formatTime(row.submitted_at)}</td>
            <td><span class="status {row.status}">{statusLabels[row.status]}</span></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{:else}
  <p class="panel panel-body muted">{archived ? 'Завершённых заявок пока нет.' : 'Заявок пока нет.'}</p>
{/if}
