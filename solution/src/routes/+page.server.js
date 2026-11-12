import { fail, redirect } from '@sveltejs/kit';
import { authenticate, getDashboard, getUser, InputError, logout, submit, updateApplication } from '$lib/server/db.js';
import { countries, determineRoute } from '$lib/server/routes.js';

const value = (form,key) => String(form.get(key) || '').trim();
const cookie = 'employment_session';
const userFor = (event) => getUser(event.cookies.get(cookie));

function questionnaire(form) {
  const data = { citizenship:value(form,'citizenship'), entryDate:value(form,'entryDate') };
  for (const key of ['highlyQualified','familyOfHighlyQualified','resettlementParticipant']) {
    const answer = value(form,key);
    if (!['yes','no'].includes(answer)) throw new InputError('Ответьте на все вопросы анкеты.');
    data[key] = answer === 'yes';
  }
  try { determineRoute(data); } catch (error) { throw new InputError(error.message); }
  return data;
}

async function filesFrom(form) {
  const files = form.getAll('documents').filter(file => typeof file !== 'string' && file.size > 0);
  if (files.length > 3 || files.some(file => file.size > 2 * 1024 * 1024)) {
    throw new InputError('Можно приложить до трёх файлов размером до 2 МБ каждый.');
  }
  return Promise.all(files.map(async file => ({name:file.name.slice(0,200),data:Buffer.from(await file.arrayBuffer())})));
}

function action(handler, needsUser = true) {
  return async event => {
    const user = userFor(event);
    if (needsUser && !user) return fail(401,{error:'Войдите в систему.'});
    try {
      const data = await event.request.formData();
      const path = await handler(event,data,user);
      redirect(303,path);
    } catch (error) {
      if (error instanceof InputError) return fail(400,{error:error.message});
      throw error;
    }
  };
}

function auth(register) {
  return action((event,form) => {
    const token = authenticate(value(form,'phone'),value(form,'code'),value(form,'name'),register);
    event.cookies.set(cookie,token,{path:'/',httpOnly:true,sameSite:'lax',secure:event.url.protocol === 'https:',maxAge:86400});
    return '/';
  },false);
}

export function load(event) {
  const user = userFor(event);
  const id = Number(event.url.searchParams.get('application'));
  if (!user) return {user:null};
  try {
    return {user,countries,...getDashboard(user,id),view:event.url.searchParams.get('view')};
  } catch (error) {
    if (error instanceof InputError) return {user,countries,...getDashboard(user,0),error:error.message};
    throw error;
  }
}

export const actions = {
  register:auth(true),
  login:auth(false),
  logout:action(event => {
    logout(event.cookies.get(cookie));
    event.cookies.delete(cookie,{path:'/'});
    return '/';
  }),
  submit:action(async (_event,form,user) => {
    const id = submit(user,questionnaire(form),await filesFrom(form));
    return '/?application='+id;
  }),
  change:action(async (_event,form,user) => {
    const id = Number(value(form,'id'));
    if (!Number.isSafeInteger(id) || id < 1) throw new InputError('Заявка недоступна.');
    const kind = value(form,'kind');
    const details = kind === 'supplement'
      ? {questionnaire:questionnaire(form),files:await filesFrom(form)}
      : {comment:value(form,'comment')};
    updateApplication(user,id,kind,details);
    return '/?application='+id;
  })
};
