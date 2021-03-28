package net.airqo;

import org.apache.kafka.common.serialization.Serde;
import org.apache.kafka.common.serialization.Serdes;

public class CustomSerdes {

    static public final class RawMeasurementsSerde
            extends Serdes.WrapperSerde<RawMeasurements> {
        public RawMeasurementsSerde() {
            super(new JsonSerializer<>(),
                    new JsonDeserializer<>(RawMeasurements.class));
        }
    }

    static public final class ProcessedMeasurementsSerde
            extends Serdes.WrapperSerde<TransformedMeasurements> {
        public ProcessedMeasurementsSerde() {
            super(new JsonSerializer<>(),
                    new JsonDeserializer<>(TransformedMeasurements.class));
        }
    }

    public static Serde<RawMeasurements> RawMeasurements() {
        return new CustomSerdes.RawMeasurementsSerde();
    }

    public static Serde<TransformedMeasurements> ProcessedMeasurements() {
        return new CustomSerdes.ProcessedMeasurementsSerde();
    }

}
