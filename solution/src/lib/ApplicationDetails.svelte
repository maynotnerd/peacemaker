<script>
  import Questionnaire from '$lib/Questionnaire.svelte';
  import ReviewActions from '$lib/ReviewActions.svelte';
  import { formatDate, formatTime, statusLabels, yesNo } from '$lib/format.js';

  let { application, countries, specialist } = $props();
  let questionnaire = $derived(application.questionnaire);
  let result = $derived(application.result);
</script>

<a class="breadcrumb" href="/">← К списку заявок</a>
<h1>Заявка №{application.id}</h1>
<div class="meta">
  <span class="status {application.status}">{statusLabels[application.status]}</span>
  <span class="muted">{application.applicant} · {formatTime(application.submitted_at)}</span>
</div>

{#if result}
  <section class="panel result">
    <h2 class="panel-title">Результат рассмотрения</h2>
    <div class="panel-body">
      <h3>{result.code ? result.code + ' · ' : ''}{result.title}</h3>
      <p>{result.action}</p>
      {#if result.period}<p><strong>Срок:</strong> {result.period}</p>{/if}
      <p class="muted">Выдал {result.specialist} · {formatTime(result.issuedAt)}</p>
    </div>
  </section>
{/if}

{#if application.requests.length}
  <section class="panel">
    <h2 class="panel-title">Запросы дополнений</h2>
    <div class="panel-body">
      {#each application.requests as request (request.id)}
        <p class="request-entry">
          {request.comment}<br>
          <span class="muted">{formatTime(request.created_at)} · {request.resolved_at ? 'Ответ получен' : 'Ожидает ответа'}</span>
        </p>
      {/each}
      {#if application.status === 'needs_info' && !specialist}
        <form class="request-form" method="POST" action={'?/change&application=' + application.id} enctype="multipart/form-data">
          <input type="hidden" name="id" value={application.id}>
          <input type="hidden" name="kind" value="supplement">
          <Questionnaire {countries} {questionnaire}/>
          <button>Отправить дополнения</button>
        </form>
      {/if}
    </div>
  </section>
{/if}

<div class="detail-grid">
  <section class="panel">
    <h2 class="panel-title">Анкета и документы</h2>
    <div class="panel-body">
      <dl>
        <dt>Гражданство</dt><dd>{countries[questionnaire.citizenship]}</dd>
        <dt>Дата въезда</dt><dd>{formatDate(questionnaire.entryDate)}</dd>
        <dt>Высококвалифицированный специалист</dt><dd>{yesNo(questionnaire.highlyQualified)}</dd>
        <dt>Член семьи специалиста</dt><dd>{yesNo(questionnaire.familyOfHighlyQualified)}</dd>
        <dt>Участник программы переселения</dt><dd>{yesNo(questionnaire.resettlementParticipant)}</dd>
      </dl>
      <div class="documents">
        <h3>Подтверждающие документы</h3>
        {#each application.documents as document (document.id)}
          <p><a href={'/files/' + document.id} download>{document.name}</a></p>
        {:else}
          <p class="muted">Документы не приложены.</p>
        {/each}
      </div>
    </div>
  </section>

  <div>
    {#if specialist}<ReviewActions {application}/>{/if}
    <section class="panel">
      <h2 class="panel-title">История статусов</h2>
      <div class="panel-body">
        <ol class="timeline">
          {#each application.history as entry}
            <li>
              <strong>{statusLabels[entry.status]}</strong><br>
              <span class="muted">{formatTime(entry.changed_at)} · {entry.name}</span>
              {#if entry.comment}<p>{entry.comment}</p>{/if}
            </li>
          {/each}
        </ol>
      </div>
    </section>
  </div>
</div>
