<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;

    public function test_la_raiz_redirige_al_login()
    {
        $this->get(route('home'))->assertRedirect(route('login'));
    }

    public function test_con_sesion_la_raiz_termina_en_el_panel()
    {
        $this->actingAs(User::factory()->create())
            ->followingRedirects()
            ->get(route('home'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard'));
    }
}
