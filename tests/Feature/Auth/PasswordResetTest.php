<?php

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Notification;

test('reset password link screen can be rendered', function () {
    $response = $this->get('/forgot-password');

    $response->assertStatus(200);
});

test('reset password link can be requested', function () {
    Notification::fake();

    $user = User::factory()->create();

    $this->post('/forgot-password', ['email' => $user->email]);

    Notification::assertSentTo($user, ResetPassword::class);
});

test('reset password screen can be rendered', function () {
    Notification::fake();

    $user = User::factory()->create();

    $this->post('/forgot-password', ['email' => $user->email]);

    Notification::assertSentTo($user, ResetPassword::class, function ($notification) {
        $response = $this->get('/reset-password/'.$notification->token);

        $response->assertStatus(200);

        return true;
    });
});

test('forgot-password is throttled after 6 attempts per minute', function () {
    // hallazgo de una auditoría de código: unthrottled, this endpoint's
    // differentiated response (success message for a registered email vs
    // a validation error for an unregistered one, per
    // PasswordResetLinkController) let anyone enumerate registered
    // accounts at whatever rate they liked - a non-existent email is
    // enough to exercise the throttle without sending any real
    // notification.
    foreach (range(1, 6) as $i) {
        $this->post('/forgot-password', ['email' => 'nobody@example.com']);
    }

    $this->post('/forgot-password', ['email' => 'nobody@example.com'])
        ->assertTooManyRequests();
});

test('password can be reset with valid token', function () {
    Notification::fake();

    $user = User::factory()->create();

    $this->post('/forgot-password', ['email' => $user->email]);

    Notification::assertSentTo($user, ResetPassword::class, function ($notification) use ($user) {
        $response = $this->post('/reset-password', [
            'token' => $notification->token,
            'email' => $user->email,
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('login'));

        return true;
    });
});
