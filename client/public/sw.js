// Whybeigh Counselling Platform — Service Worker for Web Push Notifications

self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()
    const title = data.title || 'Whybeigh Session Reminder'
    const options = {
      body: data.body || 'You have an upcoming counselling session.',
      icon: data.icon || '/favicon.ico',
      badge: '/favicon.ico',
      data: {
        url: data.url || '/',
      },
    }

    event.waitUntil(self.registration.showNotification(title, options))
  } catch (err) {
    console.error('[sw] Error processing push event:', err)
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})
