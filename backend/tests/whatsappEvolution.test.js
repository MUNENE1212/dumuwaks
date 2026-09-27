/**
 * Evolution API client: link-state gate and retry policy.
 * The axios instance is replaced with a fake — no network.
 */

process.env.EVOLUTION_INSTANCE = 'dumuwaks';
process.env.WHATSAPP_SEND_INTERVAL_MS = '1';

const evolution = require('../src/services/whatsapp/evolution.client');

function fakeHttp({ state = 'open', post }) {
  return {
    get: jest.fn(async () => ({ data: { instance: { instanceName: 'dumuwaks', state } } })),
    post: jest.fn(post || (async () => ({ data: { key: { id: 'X' } } }))),
    delete: jest.fn(),
  };
}

const httpError = (status) => Object.assign(new Error(`HTTP ${status}`), { response: { status } });
const netError = (code) => Object.assign(new Error(code), { code });

beforeEach(() => evolution.noteState(null));

it('fails fast without calling send when the phone is not linked', async () => {
  const http = fakeHttp({ state: 'connecting' });
  evolution._setHttp(http);
  await expect(evolution.sendText('254712345678', 'hi')).rejects.toMatchObject({ code: 'WHATSAPP_NOT_LINKED' });
  expect(http.post).not.toHaveBeenCalled();
});

it('uses the state a connection.update webhook reported', async () => {
  const http = fakeHttp({ state: 'close' });
  evolution._setHttp(http);
  evolution.noteState('open');
  await evolution.sendText('254712345678', 'hi');
  expect(http.get).not.toHaveBeenCalled();
  expect(http.post).toHaveBeenCalledWith('/message/sendText/dumuwaks', expect.objectContaining({ number: '254712345678', text: 'hi' }));
});

it('retries a 5xx and succeeds', async () => {
  let calls = 0;
  const http = fakeHttp({
    post: async () => {
      calls += 1;
      if (calls === 1) throw httpError(502);
      return { data: { ok: true } };
    },
  });
  evolution._setHttp(http);
  await expect(evolution.sendText('254712345678', 'hi')).resolves.toEqual({ ok: true });
  expect(calls).toBe(2);
});

it('never retries a timeout (the message may have gone out)', async () => {
  const http = fakeHttp({ post: async () => Promise.reject(netError('ECONNABORTED')) });
  evolution._setHttp(http);
  await expect(evolution.sendText('254712345678', 'hi')).rejects.toMatchObject({ code: 'ECONNABORTED' });
  expect(http.post).toHaveBeenCalledTimes(1);
});

it('does not retry a 400', async () => {
  const http = fakeHttp({ post: async () => Promise.reject(httpError(400)) });
  evolution._setHttp(http);
  await expect(evolution.sendText('254712345678', 'hi')).rejects.toBeTruthy();
  expect(http.post).toHaveBeenCalledTimes(1);
});
