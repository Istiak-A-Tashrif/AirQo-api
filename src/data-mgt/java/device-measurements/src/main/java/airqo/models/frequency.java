/**
 * Autogenerated by Avro
 *
 * DO NOT EDIT DIRECTLY
 */
package airqo.models;
@org.apache.avro.specific.AvroGenerated
public enum frequency implements org.apache.avro.generic.GenericEnumSymbol<frequency> {
  hourly, daily, raw  ;
  public static final org.apache.avro.Schema SCHEMA$ = new org.apache.avro.Schema.Parser().parse("{\"type\":\"enum\",\"name\":\"frequency\",\"namespace\":\"airqo.models\",\"symbols\":[\"hourly\",\"daily\",\"raw\"],\"default\":\"raw\"}");
  public static org.apache.avro.Schema getClassSchema() { return SCHEMA$; }
  public org.apache.avro.Schema getSchema() { return SCHEMA$; }
}
