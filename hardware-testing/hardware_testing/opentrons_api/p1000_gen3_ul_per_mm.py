"""P1000 Gen3 Microliter-per-Millimeter Tables."""
from dataclasses import replace
from typing import Optional

from opentrons.hardware_control.ot3api import OT3API

from opentrons.hardware_control.instruments.ot3.pipette import Pipette

from opentrons_shared_data.pipette.types import UlPerMm

from .types import OT3Mount

UL_PER_MM_P1000_T50: UlPerMm = {
    "aspirate": [
        [0.4148, -1705.1015, 20.5455],
        [0.4476, -80.6330, 47.2788],
        [0.5512, -1.5936, 11.9026],
        [0.6027, -18.9998, 21.4972],
        [0.6503, -15.8781, 19.6156],
        [0.7733, 3.0612, 7.2993],
        [0.8391, -5.2227, 13.7056],
        [0.9736, 3.0706, 6.7467],
        [1.1600, -0.3740, 10.1005],
        [1.3964, 1.3004, 8.1582],
        [1.5815, -0.4837, 10.6494],
        [1.8306, 1.1464, 8.0714],
        [2.0345, 0.0132, 10.1459],
        [2.6221, 0.5374, 9.0794],
        [2.9655, -1.7582, 15.0986],
        [3.5124, 0.2754, 9.0681],
        [4.6591, 1.4060, 5.0970],
        [5.3670, 0.3940, 9.8123],
        [6.0839, 0.3365, 10.1205],
        [6.8312, 0.3379, 10.1121],
        [7.5676, 0.2611, 10.6370],
        [8.2397, 0.0950, 11.8939],
        [8.9776, 0.2015, 11.0165],
        [10.4130, 0.1332, 11.6294],
        [11.8539, 0.1074, 11.8979],
        [13.3655, 0.1286, 11.6464],
        [14.8236, 0.0758, 12.3519],
        [16.3203, 0.0830, 12.2457],
        [17.7915, 0.0581, 12.6515],
        [19.2145, 0.0273, 13.1995],
        [20.6718, 0.0388, 12.9792],
        [22.1333, 0.0357, 13.0440],
        [25.0761, 0.0332, 13.0977],
        [28.0339, 0.0290, 13.2035],
        [30.9670, 0.0201, 13.4538],
        [33.8727, 0.0130, 13.6737],
        [36.8273, 0.0172, 13.5324],
        [39.7594, 0.0121, 13.7191],
        [42.6721, 0.0083, 13.8687],
        [45.5964, 0.0085, 13.8618],
        [48.5297, 0.0084, 13.8668],
        [51.4512, 0.0064, 13.9651],
    ],
    "dispense": [
        [0.4148, -1705.1015, 20.5455],
        [0.4476, -80.6330, 47.2788],
        [0.5512, -1.5936, 11.9026],
        [0.6027, -18.9998, 21.4972],
        [0.6503, -15.8781, 19.6156],
        [0.7733, 3.0612, 7.2993],
        [0.8391, -5.2227, 13.7056],
        [0.9736, 3.0706, 6.7467],
        [1.1600, -0.3740, 10.1005],
        [1.3964, 1.3004, 8.1582],
        [1.5815, -0.4837, 10.6494],
        [1.8306, 1.1464, 8.0714],
        [2.0345, 0.0132, 10.1459],
        [2.6221, 0.5374, 9.0794],
        [2.9655, -1.7582, 15.0986],
        [3.5124, 0.2754, 9.0681],
        [4.6591, 1.4060, 5.0970],
        [5.3670, 0.3940, 9.8123],
        [6.0839, 0.3365, 10.1205],
        [6.8312, 0.3379, 10.1121],
        [7.5676, 0.2611, 10.6370],
        [8.2397, 0.0950, 11.8939],
        [8.9776, 0.2015, 11.0165],
        [10.4130, 0.1332, 11.6294],
        [11.8539, 0.1074, 11.8979],
        [13.3655, 0.1286, 11.6464],
        [14.8236, 0.0758, 12.3519],
        [16.3203, 0.0830, 12.2457],
        [17.7915, 0.0581, 12.6515],
        [19.2145, 0.0273, 13.1995],
        [20.6718, 0.0388, 12.9792],
        [22.1333, 0.0357, 13.0440],
        [25.0761, 0.0332, 13.0977],
        [28.0339, 0.0290, 13.2035],
        [30.9670, 0.0201, 13.4538],
        [33.8727, 0.0130, 13.6737],
        [36.8273, 0.0172, 13.5324],
        [39.7594, 0.0121, 13.7191],
        [42.6721, 0.0083, 13.8687],
        [45.5964, 0.0085, 13.8618],
        [48.5297, 0.0084, 13.8668],
        [51.4512, 0.0064, 13.9651],
    ],
}

UL_PER_MM_P1000_T200: UlPerMm = {
    "aspirate": [
        [0.8314, -2.9322, 24.0741],
        [0.8853, -30.0996, 48.7784],
        [0.9778, -4.3627, 25.9941],
        [0.9750, 802.2301, -762.6744],
        [1.1272, -4.6837, 24.0666],
        [1.2747, -3.9100, 23.1945],
        [1.5656, -2.8032, 21.7836],
        [1.6667, -7.2039, 28.6731],
        [2.4403, -0.5147, 17.5244],
        [3.0564, -1.6013, 20.1761],
        [3.6444, -1.1974, 18.9418],
        [4.1189, -1.7877, 21.0928],
        [4.6467, -0.8591, 17.2684],
        [5.2597, -0.2070, 14.2379],
        [5.8581, -0.2196, 14.3044],
        [6.4772, -0.1025, 13.6183],
        [7.8158, 0.0537, 12.6063],
        [9.1664, 0.0507, 12.6302],
        [10.5064, 0.0285, 12.8339],
        [14.8361, 0.0818, 12.2730],
        [19.3933, 0.0801, 12.2991],
        [23.9242, 0.0487, 12.9079],
        [28.4922, 0.0379, 13.1666],
        [36.1450, 0.0277, 13.4572],
        [43.7972, 0.0184, 13.7916],
        [51.5125, 0.0154, 13.9248],
        [59.2467, 0.0121, 14.0931],
        [66.9428, 0.0084, 14.3151],
        [74.6853, 0.0079, 14.3498],
        [82.3722, 0.0052, 14.5512],
        [90.1106, 0.0054, 14.5333],
        [97.8369, 0.0043, 14.6288],
        [105.6153, 0.0046, 14.5983],
        [113.3686, 0.0036, 14.7076],
        [121.1108, 0.0030, 14.7785],
        [136.6100, 0.0026, 14.8260],
        [152.0708, 0.0018, 14.9298],
        [167.6433, 0.0021, 14.8827],
        [183.1011, 0.0012, 15.0438],
        [198.5845, 0.0011, 15.0538],
        [214.0264, 0.0008, 15.1230],
    ],
    "dispense": [
        [0.8314, -2.9322, 24.0741],
        [0.8853, -30.0996, 48.7784],
        [0.9778, -4.3627, 25.9941],
        [0.9750, 802.2301, -762.6744],
        [1.1272, -4.6837, 24.0666],
        [1.2747, -3.9100, 23.1945],
        [1.5656, -2.8032, 21.7836],
        [1.6667, -7.2039, 28.6731],
        [2.4403, -0.5147, 17.5244],
        [3.0564, -1.6013, 20.1761],
        [3.6444, -1.1974, 18.9418],
        [4.1189, -1.7877, 21.0928],
        [4.6467, -0.8591, 17.2684],
        [5.2597, -0.2070, 14.2379],
        [5.8581, -0.2196, 14.3044],
        [6.4772, -0.1025, 13.6183],
        [7.8158, 0.0537, 12.6063],
        [9.1664, 0.0507, 12.6302],
        [10.5064, 0.0285, 12.8339],
        [14.8361, 0.0818, 12.2730],
        [19.3933, 0.0801, 12.2991],
        [23.9242, 0.0487, 12.9079],
        [28.4922, 0.0379, 13.1666],
        [36.1450, 0.0277, 13.4572],
        [43.7972, 0.0184, 13.7916],
        [51.5125, 0.0154, 13.9248],
        [59.2467, 0.0121, 14.0931],
        [66.9428, 0.0084, 14.3151],
        [74.6853, 0.0079, 14.3498],
        [82.3722, 0.0052, 14.5512],
        [90.1106, 0.0054, 14.5333],
        [97.8369, 0.0043, 14.6288],
        [105.6153, 0.0046, 14.5983],
        [113.3686, 0.0036, 14.7076],
        [121.1108, 0.0030, 14.7785],
        [136.6100, 0.0026, 14.8260],
        [152.0708, 0.0018, 14.9298],
        [167.6433, 0.0021, 14.8827],
        [183.1011, 0.0012, 15.0438],
        [198.5845, 0.0011, 15.0538],
        [214.0264, 0.0008, 15.1230],
    ],
}

UL_PER_MM_P1000_T1000: UlPerMm = {
    "aspirate": [
        [0.7511, 3.9556, 6.455],
        [1.3075, 2.1664, 5.8839],
        [1.8737, 1.1513, 7.2111],
        [3.177, 0.9374, 7.612],
        [4.5368, 0.5531, 8.8328],
        [7.31, 0.3035, 9.9651],
        [10.0825, 0.1513, 11.0781],
        [12.9776, 0.1293, 11.2991],
        [15.9173, 0.0976, 11.7115],
        [18.8243, 0.06244, 12.2706],
        [21.8529, 0.07004, 12.1275],
        [24.8068, 0.04182, 12.7442],
        [27.7744, 0.0356, 12.8984],
        [35.2873, 0.03031, 13.04544],
        [42.799, 0.02015, 13.4038],
        [50.4562, 0.01956, 13.4293],
        [58.1081, 0.0145, 13.6843],
        [65.7267, 0.01036, 13.9252],
        [73.2857, 0.006776, 14.1606],
        [81.00159, 0.009126, 13.9883],
        [88.6617, 0.006448, 14.2052],
        [103.9829, 0.005074, 14.3271],
        [119.4408, 0.004878, 14.3476],
        [134.889, 0.003727, 14.485],
        [150.273, 0.00258, 14.6402],
        [181.2798, 0.002559, 14.6427],
        [212.4724, 0.002242, 14.7002],
        [243.577, 0.00151, 14.856],
        [274.7216, 0.001244, 14.9205],
        [305.8132, 0.0009118, 15.0118],
        [368.06968, 0.0007321, 15.06677],
        [430.2513, 0.0004805, 15.1594],
        [492.3487, 0.0003186, 15.2291],
        [554.5713, 0.0003031, 15.237],
        [616.6825, 0.0001981, 15.2948],
        [694.4168, 0.0001855, 15.3027],
        [772.0327, 0.0001181, 15.3494],
        [849.617, 0.00008929, 15.3717],
        [927.2556, 0.00008601, 15.3745],
        [1004.87, 0.00006801, 15.3912],
        [1051.4648, 0.00006824, 15.391],
    ],
    "dispense": [
        [0.7511, 3.9556, 6.455],
        [1.3075, 2.1664, 5.8839],
        [1.8737, 1.1513, 7.2111],
        [3.177, 0.9374, 7.612],
        [4.5368, 0.5531, 8.8328],
        [7.31, 0.3035, 9.9651],
        [10.0825, 0.1513, 11.0781],
        [12.9776, 0.1293, 11.2991],
        [15.9173, 0.0976, 11.7115],
        [18.8243, 0.06244, 12.2706],
        [21.8529, 0.07004, 12.1275],
        [24.8068, 0.04182, 12.7442],
        [27.7744, 0.0356, 12.8984],
        [35.2873, 0.03031, 13.04544],
        [42.799, 0.02015, 13.4038],
        [50.4562, 0.01956, 13.4293],
        [58.1081, 0.0145, 13.6843],
        [65.7267, 0.01036, 13.9252],
        [73.2857, 0.006776, 14.1606],
        [81.00159, 0.009126, 13.9883],
        [88.6617, 0.006448, 14.2052],
        [103.9829, 0.005074, 14.3271],
        [119.4408, 0.004878, 14.3476],
        [134.889, 0.003727, 14.485],
        [150.273, 0.00258, 14.6402],
        [181.2798, 0.002559, 14.6427],
        [212.4724, 0.002242, 14.7002],
        [243.577, 0.00151, 14.856],
        [274.7216, 0.001244, 14.9205],
        [305.8132, 0.0009118, 15.0118],
        [368.06968, 0.0007321, 15.06677],
        [430.2513, 0.0004805, 15.1594],
        [492.3487, 0.0003186, 15.2291],
        [554.5713, 0.0003031, 15.237],
        [616.6825, 0.0001981, 15.2948],
        [694.4168, 0.0001855, 15.3027],
        [772.0327, 0.0001181, 15.3494],
        [849.617, 0.00008929, 15.3717],
        [927.2556, 0.00008601, 15.3745],
        [1004.87, 0.00006801, 15.3912],
        [1051.4648, 0.00006824, 15.391],
    ],
}


def overwrite_attached_pipette_ul_per_mm(
    api: OT3API, mount: OT3Mount, ul_per_mm: UlPerMm
) -> None:
    """Switch the attached Pipette's ul_per_mm table."""
    pipette: Optional[Pipette] = api._pipette_handler._attached_instruments[mount]
    if pipette is None:
        raise RuntimeError(f"No pipette is attached to mount: {mount}")
    pipette._config = replace(pipette._config, ul_per_mm=ul_per_mm)  # type: ignore[type-var]
