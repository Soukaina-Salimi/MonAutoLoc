<!DOCTYPE html>
<html>

<head>
    <title>Réinitialisation mot de passe</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }

        .btn {
            display: inline-block;
            padding: 10px 20px;
            background: #4F46E5;
            color: white;
            text-decoration: none;
            border-radius: 8px;
        }

        .btn:hover {
            background: #4338CA;
        }
    </style>
</head>

<body>
    <div class="container">
        <h1>Réinitialisation de votre mot de passe</h1>
        <p>Bonjour,</p>
        <p>Nous avons reçu une demande de réinitialisation de votre mot de passe.</p>
        <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</p>
        <p>
            <a href="{{ $resetUrl }}" class="btn">Réinitialiser mon mot de passe</a>
        </p>
        <p>Ce lien expire dans <strong>60 minutes</strong>.</p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        <hr>
        <p style="font-size: 12px; color: #666;">&copy; {{ date('Y') }} AutoRent. Tous droits réservés.</p>
    </div>
</body>

</html>