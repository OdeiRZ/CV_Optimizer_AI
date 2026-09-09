<?php

test('registration screen can be rendered', function () {
    $response = $this->get('/register');

    $response->assertStatus(200);
});

test('new users can register', function () {
    $response = $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));
});

test('registration is throttled after 6 attempts per minute', function () {
    // A hallazgo de una auditoría de código: unlike login (throttled per
    // email+IP in LoginRequest), registration had no throttle at all - open
    // to mass account creation. An always-invalid payload (never a real
    // registration) isolates the throttle itself from any side effect of
    // an actual account being created.
    $invalidPayload = ['name' => 'Test User', 'email' => 'not-an-email'];

    foreach (range(1, 6) as $i) {
        $this->post('/register', $invalidPayload);
    }

    $this->post('/register', $invalidPayload)->assertTooManyRequests();
});
