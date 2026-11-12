<script>
  import AccountAccess from '$lib/AccountAccess.svelte';
  import ApplicationDetails from '$lib/ApplicationDetails.svelte';
  import ApplicationList from '$lib/ApplicationList.svelte';
  import Questionnaire from '$lib/Questionnaire.svelte';

  let { data, form } = $props();
  let specialist = $derived(data.user?.role === 'specialist');
  let archived = $derived(data.view === 'history' && !specialist);
  let creating = $derived(data.view === 'new' && !specialist);
  let errorMessage = $derived(form?.error || data.error);
</script>

<svelte:head>
  <title>Выбор порядка трудоустройства</title>
</svelte:head>

<header class="top">
  <div class="wrap bar">
    <a class="brand" href="/">Маршрут трудоустройства</a>
    {#if data.user}
      <div class="account">
        <span>{data.user.name} · {specialist ? 'Специалист' : 'Заявитель'}</span>
        <form method="POST" action="?/logout"><button class="secondary">Выйти</button></form>
      </div>
    {/if}
  </div>
</header>

{#if data.user}
  <div class="wrap workspace">
    <aside>
      <nav class="side-nav" aria-label="Кабинет">
        <a href="/" aria-current={!archived && !creating ? 'page' : undefined}>{specialist ? 'Поступившие заявки' : 'Мои заявки'}</a>
        {#if !specialist}
          <a href="/?view=history" aria-current={archived ? 'page' : undefined}>Оказанные услуги</a>
        {/if}
      </nav>
      {#if !specialist && !creating}
        <a class="button side-action" href="/?view=new">Подать заявку</a>
      {/if}
    </aside>

    <main class="content">
      {#if errorMessage}<p class="alert" role="alert">{errorMessage}</p>{/if}
      {#if creating}
        <a class="breadcrumb" href="/">← К списку заявок</a>
        <h1>Новая заявка</h1>
        <section class="panel narrow">
          <h2 class="panel-title">Анкета заявителя</h2>
          <form class="panel-body" method="POST" action="?/submit&view=new" enctype="multipart/form-data">
            <Questionnaire countries={data.countries}/>
            <div class="form-footer"><button>Отправить на рассмотрение</button></div>
          </form>
        </section>
      {:else if data.application}
        <ApplicationDetails application={data.application} countries={data.countries} {specialist}/>
      {:else}
        <ApplicationList rows={data.rows} {specialist} {archived}/>
      {/if}
    </main>
  </div>
{:else}
  <main class="wrap sign-in">
    {#if errorMessage}<p class="alert" role="alert">{errorMessage}</p>{/if}
    <AccountAccess/>
  </main>
{/if}
