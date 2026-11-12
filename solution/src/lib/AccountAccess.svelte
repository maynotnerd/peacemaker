<h1>Выбор порядка трудоустройства</h1>
<p class="subtitle muted">Подайте анкету, чтобы получить дальнейшие действия и сроки.</p>

<div class="auth-grid">
  <section class="panel">
    <h2 class="panel-title">Войти</h2>
    <form class="panel-body" method="POST" action="?/login">
      <label>
        Телефон
        <input name="phone" type="tel" autocomplete="tel" placeholder="+7 999 000-00-01" required>
      </label>
      <label>
        Учебный код
        <input name="code" inputmode="numeric" autocomplete="one-time-code" placeholder="123456" required>
      </label>
      <button>Войти в кабинет</button>
    </form>
  </section>

  <section class="panel">
    <h2 class="panel-title">Регистрация заявителя</h2>
    <form class="panel-body" method="POST" action="?/register">
      <label>
        Имя
        <input name="name" autocomplete="name" maxlength="100" required>
      </label>
      <label>
        Телефон
        <input name="phone" type="tel" autocomplete="tel" required>
      </label>
      <label>
        Учебный код
        <input name="code" inputmode="numeric" autocomplete="one-time-code" placeholder="123456" required>
      </label>
      <button class="secondary">Создать учётную запись</button>
    </form>
  </section>
</div>
