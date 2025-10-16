terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.40"
    }
  }
}

provider "cloudflare" {
  api_token = var.api_token
}

resource "cloudflare_tunnel" "uptime" {
  account_id = var.account_id
  name       = "uptime-tunnel"
}

resource "cloudflare_tunnel_config" "uptime" {
  tunnel_id  = cloudflare_tunnel.uptime.id
  account_id = var.account_id

  config {
    ingress_rule {
      hostname = var.api_host
      service  = "http://YOUR_INGRESS_IP_OR_LB:80"
    }

    ingress_rule {
      hostname = var.status_host
      service  = "http://YOUR_INGRESS_IP_OR_LB:80"
    }

    ingress_rule {
      service = "http_status:404"
    }
  }
}

resource "cloudflare_record" "api" {
  zone_id = var.zone_id
  name    = var.api_host
  type    = "CNAME"
  value   = cloudflare_tunnel.uptime.cname
  proxied = true
}

resource "cloudflare_record" "status" {
  zone_id = var.zone_id
  name    = var.status_host
  type    = "CNAME"
  value   = cloudflare_tunnel.uptime.cname
  proxied = true
}
