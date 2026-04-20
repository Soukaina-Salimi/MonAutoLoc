<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\HandleCors;


return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
   ->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'auth.service' => \App\Http\Middleware\VerifyTokenWithAuthService::class,
    ]);
})
    ->withExceptions(function ($exceptions) {
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, $request) {
            return response()->json([
                'message' => 'Unauthenticated.'
            ], 401);
        });
    })->create();
