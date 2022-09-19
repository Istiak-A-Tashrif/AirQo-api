resource "google_compute_instance" "pipeline_k8s_controller" {
  boot_disk {
    auto_delete = true
    device_name = "pipeline-k8s-controller"

    initialize_params {
      image = "https://www.googleapis.com/compute/beta/projects/ubuntu-os-cloud/global/images/ubuntu-2004-focal-v20220712"
      size  = 50
      type  = "pd-balanced"
    }

    mode   = "READ_WRITE"
    source = "https://www.googleapis.com/compute/v1/projects/airqo-250220/zones/europe-west1-b/disks/pipeline-k8s-controller"
  }

  confidential_instance_config {
    enable_confidential_compute = false
  }

  machine_type = "n2-standard-2"

  name = "pipeline-k8s-controller"

  network_interface {
    access_config {
      nat_ip       = "34.140.20.232"
      network_tier = "PREMIUM"
    }

    network            = "https://www.googleapis.com/compute/v1/projects/airqo-250220/global/networks/pipeline-k8s-cluster"
    network_ip         = "10.132.0.14"
    stack_type         = "IPV4_ONLY"
    subnetwork         = "https://www.googleapis.com/compute/v1/projects/airqo-250220/regions/europe-west1/subnetworks/pipeline-k8s-cluster"
    subnetwork_project = "airqo-250220"
  }

  project = "airqo-250220"

  reservation_affinity {
    type = "ANY_RESERVATION"
  }

  scheduling {
    automatic_restart   = true
    on_host_maintenance = "MIGRATE"
    provisioning_model  = "STANDARD"
  }

  service_account {
    email  = "702081712633-compute@developer.gserviceaccount.com"
    scopes = ["https://www.googleapis.com/auth/devstorage.read_only", "https://www.googleapis.com/auth/logging.write", "https://www.googleapis.com/auth/monitoring.write", "https://www.googleapis.com/auth/service.management.readonly", "https://www.googleapis.com/auth/servicecontrol", "https://www.googleapis.com/auth/trace.append"]
  }

  shielded_instance_config {
    enable_integrity_monitoring = true
    enable_vtpm                 = true
  }

  tags = ["http-server", "https-server"]
  zone = "europe-west1-b"
}
# terraform import google_compute_instance.pipeline_k8s_controller projects/airqo-250220/zones/europe-west1-b/instances/pipeline-k8s-controller
