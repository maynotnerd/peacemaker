import { error } from '@sveltejs/kit';
import { getUser, readDocument, InputError } from '$lib/server/db.js';

export function GET({params,cookies}) {
  const user = getUser(cookies.get('employment_session'));
  if (!user) error(401,'Войдите в систему.');
  try {
    const document = readDocument(user,Number(params.id));
    return new Response(document.data, {headers:{
      'Content-Type':'application/octet-stream',
      'Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(document.name).replace(/'/g,'%27'),
      'X-Content-Type-Options':'nosniff',
      'Cache-Control':'private, no-store'
    }});
  } catch (cause) {
    if (cause instanceof InputError) error(404,'Документ недоступен.');
    throw cause;
  }
}
