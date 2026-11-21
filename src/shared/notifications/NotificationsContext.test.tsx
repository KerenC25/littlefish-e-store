import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationsProvider, notificationsReducer, useNotify } from './NotificationsContext';

describe('NotificationsContext (global state without Redux)', () => {
  it('queues and dismisses notifications, capping the queue', () => {
    let queue = notificationsReducer([], { type: 'pushed', notification: { id: 1, message: 'a', severity: 'info' } });
    for (let id = 2; id <= 7; id++) {
      queue = notificationsReducer(queue, { type: 'pushed', notification: { id, message: String(id), severity: 'info' } });
    }
    expect(queue.map((n) => n.id)).toEqual([3, 4, 5, 6, 7]);
    expect(notificationsReducer(queue, { type: 'dismissed', id: 3 }).map((n) => n.id)).toEqual([4, 5, 6, 7]);
  });

  it('shows a toast from anywhere in the tree', async () => {
    const Trigger = () => {
      const notify = useNotify();
      return <button onClick={() => notify('Sharp sharp')}>Notify</button>;
    };
    render(
      <NotificationsProvider>
        <Trigger />
      </NotificationsProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Notify' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Sharp sharp');
  });

  it('fails fast when used outside its provider', () => {
    const Orphan = () => {
      useNotify();
      return null;
    };
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Orphan />)).toThrow(/NotificationsProvider/);
  });
});
