<?php

test('home redirects to login for guests', function () {
    $response = $this->get('/');
    $response->assertRedirect('/login');
});