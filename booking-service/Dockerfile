FROM php:8.2-apache

RUN apt-get update && apt-get install -y \
    libzip-dev zip unzip git curl \
    libpng-dev libjpeg-dev libfreetype6-dev \
    && rm -rf /var/lib/apt/lists/*

RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo pdo_mysql zip gd

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

RUN a2enmod rewrite

WORKDIR /var/www/html

# 🔥 Copier tout AVANT composer
COPY . .

# 🔥 Maintenant ça marche
RUN composer install --no-dev --optimize-autoloader

RUN chown -R www-data:www-data /var/www/html/storage
RUN chmod -R 775 /var/www/html/storage

COPY docker/apache.conf /etc/apache2/sites-available/000-default.conf

EXPOSE 80