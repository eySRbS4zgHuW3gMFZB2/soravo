use cpal::traits::{DeviceTrait, HostTrait};

pub struct CpalDeviceInfo {
    pub index: String,
    pub name: String,
    pub is_default: bool,
    pub device: cpal::Device,
}

pub fn list_input_devices() -> Result<Vec<CpalDeviceInfo>, Box<dyn std::error::Error>> {
    let host = crate::get_cpal_host();
    let default_name = host.default_input_device().and_then(|d| d.name().ok());

    let mut out = Vec::new();
    for (index, device) in host.input_devices()?.enumerate() {
        let name = device.name().unwrap_or_else(|_| "Unknown".into());
        let is_default = Some(name.clone()) == default_name;
        out.push(CpalDeviceInfo {
            index: index.to_string(),
            name,
            is_default,
            device,
        });
    }
    Ok(out)
}

pub fn list_output_devices() -> Result<Vec<CpalDeviceInfo>, Box<dyn std::error::Error>> {
    let host = crate::get_cpal_host();
    let default_name = host.default_output_device().and_then(|d| d.name().ok());

    let mut out = Vec::new();
    for (index, device) in host.output_devices()?.enumerate() {
        let name = device.name().unwrap_or_else(|_| "Unknown".into());
        let is_default = Some(name.clone()) == default_name;
        out.push(CpalDeviceInfo {
            index: index.to_string(),
            name,
            is_default,
            device,
        });
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::super::recorder::{is_microphone_access_denied, is_no_input_device_error};
    use super::*;

    #[test]
    fn access_denied_classifier_covers_platform_messages() {
        // Windows HRESULT, Unix errno text, mixed case.
        assert!(is_microphone_access_denied(
            "Access is denied. (0x80070005)"
        ));
        assert!(is_microphone_access_denied(
            "open /dev/snd/pcmC0D0c: permission denied"
        ));
        assert!(is_microphone_access_denied("PERMISSION DENIED by policy"));
        assert!(is_microphone_access_denied(
            "device error 0x80070005 during open"
        ));
        // Negatives: ordinary failures must not classify as denial.
        assert!(!is_microphone_access_denied("no input device found"));
        assert!(!is_microphone_access_denied("device busy"));
        assert!(!is_microphone_access_denied(""));
        assert!(!is_microphone_access_denied("timeout while opening stream"));
    }

    #[test]
    fn no_input_device_classifier_covers_backend_messages() {
        assert!(is_no_input_device_error("no input device found"));
        assert!(is_no_input_device_error("NO INPUT DEVICE FOUND on host"));
        // Negatives.
        assert!(!is_no_input_device_error("permission denied"));
        assert!(!is_no_input_device_error(""));
        assert!(!is_no_input_device_error("device disconnected"));
    }

    #[test]
    fn input_enumeration_never_panics_and_stays_well_formed() {
        // Headless/CI machines may have no audio backend: both outcomes are
        // acceptable, but the call must not panic and any Ok entries must be
        // well-formed (numeric index). Live device counts are recorded in
        // progress/ACCEPTANCE.md, not asserted here.
        match list_input_devices() {
            Ok(devices) => {
                for d in &devices {
                    assert!(d.index.parse::<usize>().is_ok(), "non-numeric index");
                }
                println!("BENCH accept input devices: {}", devices.len());
            }
            Err(e) => {
                assert!(!e.to_string().is_empty(), "empty enumeration error");
                println!("BENCH accept input enumeration unavailable: {}", e);
            }
        }
    }
}
