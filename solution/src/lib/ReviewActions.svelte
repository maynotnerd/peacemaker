<script>
  let { application } = $props();
  let action = $derived('?/change&application=' + application.id);
</script>

{#if ['submitted', 'review'].includes(application.status)}
  <section class="panel">
    <h2 class="panel-title">Рассмотрение</h2>
    <div class="panel-body">
      <form method="POST" {action}>
        <input type="hidden" name="id" value={application.id}>
        {#if application.status === 'submitted'}
          <button name="kind" value="start">Начать рассмотрение</button>
        {:else}
          <button name="kind" value="complete">Завершить и выдать результат</button>
        {/if}
      </form>
      {#if application.status === 'review'}
        <form class="request-form" method="POST" {action}>
          <input type="hidden" name="id" value={application.id}>
          <label>
            Что нужно дополнить
            <textarea name="comment" required maxlength="1000" rows="3"></textarea>
          </label>
          <button class="secondary" name="kind" value="request">Запросить дополнения</button>
        </form>
      {/if}
    </div>
  </section>
{/if}
